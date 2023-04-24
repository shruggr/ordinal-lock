import { expect, use } from 'chai'
import {
    bsv,
    findSig,
    MethodCallOptions,
    PubKey,
    Ripemd160,
    SigHash,
    SmartContract,
    TransactionResponse,
} from 'scrypt-ts'
import { OrdinalLock } from '../../src/contracts/ordinal-lock'
import { dummyUTXO, getDummySigner, randomPrivateKey } from './utils/txHelper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [sellerPriv, sellerPub, sellerPKH, sellerAdd] = randomPrivateKey()
const [badPriv, badPub, badPKH, badAdd] = randomPrivateKey()

describe('Test SmartContract `OrdinalLock`', () => {
    let instance: OrdinalLock
    const sellerScript = bsv.Script.fromAddress(sellerAdd)
    const payOut = new bsv.Transaction.Output({
        script: sellerScript,
        satoshis: 1000,
    })
        .toBufferWriter()
        .toBuffer()

    const buyerOut = new bsv.Transaction.Output({
        script: sellerScript,
        satoshis: 1,
    })
        .toBufferWriter()
        .toBuffer()
    let deployTx: TransactionResponse

    before(async () => {
        await OrdinalLock.compile()

        instance = new OrdinalLock(
            Ripemd160(sellerPKH.toString('hex')),
            payOut.toString('hex')
        )

        instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)
        instance.bindTxBuilder(
            'purchaseWithChange',
            OrdinalLock.purchaseWithChangeTxBuilder
        )

        await instance.connect(getDummySigner([sellerPriv]))
        deployTx = await instance.deploy(1)
        console.log('OrdinalLock contract deployed: ', deployTx.id)
    })

    it('should pass the cancel method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.cancel(
            (sigResps) => findSig(sigResps, sellerPub),
            PubKey(sellerPub.toString()),
            {
                pubKeyOrAddrToSign: [sellerPub],
            } as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail the cancel method unit test with bad seller.', async () => {
        expect(
            instance.methods.cancel(
                (sigResps) => findSig(sigResps, sellerPub),
                PubKey(badPub.toString()),
                {
                    pubKeyOrAddrToSign: [sellerPub],
                } as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith('bad seller')
    })

    it('should fail the cancel method unit test with signature check failed.', async () => {
        expect(
            instance.methods.cancel(
                (sigResps) => findSig(sigResps, badPub),
                PubKey(sellerPub.toString()),
                {
                    pubKeyOrAddrToSign: [badPub],
                } as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith('signature check failed')
    })

    it('should pass the purchase method unit test successfully', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            buyerOut.toString('hex'),
            {} as MethodCallOptions<OrdinalLock>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass the purchaseWithChange method unit test successfully with change', async () => {
        const { tx: callTx, atInputIndex } =
            await instance.methods.purchaseWithChange(
                buyerOut.toString('hex'),
                { changeAddress: sellerAdd } as MethodCallOptions<OrdinalLock>
            )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass the purchaseWithChange method unit test successfully without change', async () => {
        const { tx: callTx, atInputIndex } =
            await instance.methods.purchaseWithChange(
                buyerOut.toString('hex'),
                {} as MethodCallOptions<OrdinalLock>
            )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should return a partially-signed transaction', async () => {
        const { tx: callTx, atInputIndex } =
            await OrdinalLock.purchaseTxBuilder(
                instance,
                {},
                buyerOut.toString('hex')
            )

        expect(callTx.inputs[0].script.toHex(), 'input script populated').to.eq(
            ''
        )

        instance.signer.signTransaction(callTx)
        expect(
            callTx.inputs[0].script.toHex(),
            'input script not populated'
        ).to.not.eq('')
    })

    it('should pass the purchase method unit test successfully.', async () => {
        const tx = new bsv.Transaction()
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(buyerOut)
                )
            )
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(payOut)
                )
            )
            .from({
                txId: deployTx.id,
                outputIndex: 0,
                script: deployTx.outputs[0].script.toHex(),
                satoshis: deployTx.outputs[0].satoshis,
            })
        // .from(dummyUTXO)
        // .change(sellerAdd)

        // build input first time to get size in order to properly calculate fee/change
        const preimage = bsv.Transaction.Sighash.sighashPreimage(
            tx,
            0xc1,
            0,
            deployTx.outputs[0].script,
            new bsv.crypto.BN(deployTx.outputs[0].satoshis),
            bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
        )
        tx.inputs[0].setScript(
            bsv.Script.fromBuffer(Buffer.alloc(0))
                .add(buyerOut)
                .add(preimage)
                .add(bsv.Opcode.OP_0)
        )

        // set appropriate change output
        // tx.change(sellerAdd)

        // build input 2nd time to get with proper change output
        // preimage = bsv.Transaction.Sighash.sighashPreimage(
        //     tx,
        //     0xc1,
        //     0,
        //     deployTx.outputs[0].script,
        //     new bsv.crypto.BN(deployTx.outputs[0].satoshis),
        //     bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
        // );
        // tx.inputs[0].setScript(bsv.Script.fromBuffer(Buffer.alloc(0))
        //     .add(buyerOut)
        //     .add(preimage)
        //     // .add(tx.getChangeAmount())
        //     .add(new bsv.crypto.BN(tx.getChangeAmount()).toBuffer())
        //     .add(tx.getChangeAddress().hashBuffer)
        //     .add(bsv.Opcode.OP_0)
        // )

        // console.log('Tx: ', JSON.stringify(tx))
        const result = tx.verifyScript(0)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail the purchase method unit test bad payOut.', async () => {
        const badScript = bsv.Script.fromAddress(badAdd).toHex()
        expect(
            instance.methods.purchase(
                badScript,
                {} as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith('bad self output')
    })
})
