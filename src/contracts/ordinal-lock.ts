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
    payOut: ByteString

    constructor(seller: PubKeyHash, payOut: ByteString) {
        super(...arguments)

        this.seller = seller
        this.payOut = payOut
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(buyerScript: ByteString) {
        assert(
            hash256(
                Utils.buildOutput(buyerScript, this.ctx.utxo.value) +
                    this.payOut +
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
        const input = current.buildContractInput()
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // build next instance output
            .addOutput(
                new bsv.Transaction.Output({
                    script: new bsv.Script(buyerScript),
                    satoshis: current.balance,
                })
            )
            // build payment output
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(current.payOut, 'hex')
                    )
                )
            )
            // add contract input
            .addInput(input)

        if (options.changeAddress) {
            // build change output
            unsignedTx.change(options.changeAddress)
        }

        // console.log("callTx: ", JSON.stringify(unsignedTx.toObject(), null, 2))
        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        })
    }
}
