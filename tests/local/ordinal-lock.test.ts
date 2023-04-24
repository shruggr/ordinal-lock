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
    const payOut = new bsv.Transaction.Output({
        script: bsv.Script.fromAddress(sellerAdd),
        satoshis: 1000,
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

        // instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)

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

    it('should pass the purchase method unit test successfully.', async () => {
        const tx = new bsv.Transaction()
            .addOutput(
                new bsv.Transaction.Output({
                    script: new bsv.Script(sellerAdd),
                    satoshis: instance.balance,
                })
            )
            //         // build payment output
            .addOutput(
                bsv.Transaction.Output.fromBufferReader(
                    new bsv.encoding.BufferReader(
                        Buffer.from(instance.payOutput, 'hex')
                    )
                )
            )
            //         // add contract input
            .from({
                txId: deployTx.id,
                outputIndex: 0,
                script: deployTx.outputs[0].script.toString(),
                satoshis: deployTx.outputs[0].satoshis,
            })

        // const asm = `${tx.outputs[0].toBufferWriter().toBuffer().toString('hex')} OP_0 ${tx.getPreimage(0, 0xc1, false)} OP_0`
        // const preimage = tx.pre
        const script = bsv.Script.fromBuffer(Buffer.alloc(0))
            .add(tx.outputs[0].toBufferWriter().toBuffer())
            .add(bsv.Opcode.OP_0)
            .add(
                bsv.Transaction.Sighash.sighashPreimage(
                    tx,
                    0xc1,
                    0,
                    deployTx.outputs[0].script,
                    new bsv.crypto.BN(deployTx.outputs[0].satoshis),
                    0x40
                )
            )
            .add(bsv.Opcode.OP_0)
        tx.inputs[0].setScript(script)

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
