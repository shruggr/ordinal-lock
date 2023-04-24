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
        selfOutput: ByteString,
        trailingOutputs: ByteString
    ): Promise<ContractTransaction> {
        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // build next instance output
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(selfOutput, 'hex')
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
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(trailingOutputs, 'hex')
                    )
                )
            )
            // add contract input
            .addInput(current.buildContractInput())

        if (options.changeAddress) {
            // build change output
            unsignedTx.change(options.changeAddress)
        }

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        })
    }
}
