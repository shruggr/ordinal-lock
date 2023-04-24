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

    // static purchaseTxBuilder(
    //     current: OrdinalLock,
    //     options: MethodCallOptions<OrdinalLock>,
    //     buyerScript: ByteString
    // ): Promise<ContractTransaction> {
    //     const unsignedTx: bsv.Transaction = new bsv.Transaction()
    //         // build next instance output
    //         .addOutput(
    //             new bsv.Transaction.Output({
    //                 script: new bsv.Script(buyerScript),
    //                 satoshis: current.balance,
    //             })
    //         )
    //         // build payment output
    //         .addOutput(
    //             bsv.Transaction.Output.fromBufferReader(
    //                 new bsv.encoding.BufferReader(
    //                     Buffer.from(current.payOut, 'hex')
    //                 )
    //             )
    //         )
    //         // add contract input
    //         .addInput(current.buildContractInput())

    //     if (options.changeAddress) {
    //         // build change output
    //         unsignedTx.change(options.changeAddress)
    //         unsignedTx.inputs[0] = current.buildContractInput()
    //     }

    //     return Promise.resolve({
    //         tx: unsignedTx,
    //         atInputIndex: 0,
    //         nexts: [],
    //     })
    // }
}
