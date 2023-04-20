import {
    assert,
    bsv,
    ByteString,
    hash160,
    hash256,
    method,
    prop,
    PubKey,
    PubKeyHash,
    SmartContract,
    Sig,
    SigHash,
    Utils,
    MethodCallOptions,
    ContractTransaction,
} from 'scrypt-ts'

export class OrdinalLock extends SmartContract {
    @prop()
    seller: PubKeyHash

    @prop()
    payScript: ByteString

    @prop()
    paySats: bigint

    constructor(seller: PubKeyHash, payScript: ByteString, paySats: bigint) {
        super(...arguments)

        this.seller = seller
        this.payScript = payScript
        this.paySats = paySats
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(buyerScript: ByteString) {
        assert(
            hash256(
                Utils.buildOutput(buyerScript, 1n) +
                    Utils.buildOutput(this.payScript, this.paySats) +
                    this.buildChangeOutput()
            ) == this.ctx.hashOutputs,
            'bad outputs'
        )
    }

    @method()
    public cancel(sig: Sig, pubkey: PubKey) {
        assert(this.seller == hash160(pubkey), 'bad seller')
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }

    static purchaseTxBuilder(
        current: OrdinalLock,
        options: MethodCallOptions<OrdinalLock>,
        buyerScript: ByteString
    ): Promise<ContractTransaction> {
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // build next instance output
            .addOutput(
                new bsv.Transaction.Output({
                    script: new bsv.Script(buyerScript),
                    satoshis: current.balance,
                })
            )
            // build payment output
            .addOutput(
                new bsv.Transaction.Output({
                    script: new bsv.Script(current.payScript),
                    satoshis: Number(current.paySats),
                })
            )
            // build change output
            .change(options.changeAddress)

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        })
    }
}
