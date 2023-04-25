import {
    assert,
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
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

export class OrdinalLock extends SmartContract {
    @prop()
    seller: PubKeyHash

    @prop()
    payOutput: ByteString

    constructor(seller: PubKeyHash, payOutput: ByteString) {
        super(...arguments)

        this.seller = seller
        this.payOutput = payOutput
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(selfOutput: ByteString, trailingOutputs: ByteString) {
        assert(
            hash256(selfOutput + this.payOutput + trailingOutputs) ==
                this.ctx.hashOutputs
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
        buyerOutput: ByteString,
        changeOutput: ByteString
    ): Promise<ContractTransaction> {
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // build next instance output
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(buyerOutput, 'hex')
                    )
                )
            )
            // build payment output
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(current.payOutput, 'hex')
                    )
                )
            )

        if (changeOutput) {
            unsignedTx.addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(changeOutput, 'hex')
                    )
                )
            )
        }

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        })
    }
}
