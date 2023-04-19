import { expect, use } from 'chai'
import {
    bsv,
    ContractTransaction,
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    Ripemd160,
    sha256,
    toByteString,
} from 'scrypt-ts'
import { OrdinalLock } from '../../src/contracts/ordinal-lock'
import {
    getDummySigner,
    getDummyUTXO,
    randomPrivateKey,
} from './utils/txHelper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const [sellerPriv, sellerPub, sellerPKH, sellerAdd] = randomPrivateKey()
const [badPriv, badPub, badPKH, badAdd] = randomPrivateKey()

describe('Test SmartContract `OrdinalLock`', () => {
    let instance: OrdinalLock
    let payOut: bsv.Transaction.Output

    beforeEach(async () => {
        await OrdinalLock.compile()
        payOut = new bsv.Transaction.Output({
            script: bsv.Script.fromAddress(sellerAdd),
            satoshis: 1000,
        })

        instance = new OrdinalLock(
            Ripemd160(sellerPKH.toString('hex')),
            toByteString(
                payOut.toBufferWriter().toBuffer().toString('hex'),
                false
            )
        )
        await instance.connect(getDummySigner([sellerPriv]))
    })

    it('should pass the cancel method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.cancel(
            (sigResps) => findSig(sigResps, sellerPub),
            PubKey(sellerPub.toString()),
            {
                pubKeyOrAddrToSign: [sellerPub],
                fromUTXO: getDummyUTXO(),
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
                    fromUTXO: getDummyUTXO(),
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
                    fromUTXO: getDummyUTXO(),
                } as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith('signature check failed')
    })

    it('should pass the purchase method unit test successfully.', async () => {
        const tx = new bsv.Transaction()
        const selfOut = new bsv.Transaction.Output({
            script: bsv.Script.fromAddress(sellerAdd),
            satoshis: 1,
        })
        tx.addOutput(selfOut)
        tx.addOutput(payOut)
        tx.change(sellerAdd)
        instance.bindTxBuilder(
            'purchase',
            async (
                current: OrdinalLock,
                options: MethodCallOptions<OrdinalLock>,
                ...args: any
            ): Promise<ContractTransaction> => {
                tx.addInput(current.buildContractInput(options.fromUTXO))

                return {
                    tx,
                    atInputIndex: 0,
                    nexts: [],
                }
            }
        )

        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            toByteString(
                selfOut.toBufferWriter().toBuffer().toString('hex'),
                false
            ),
            {
                pubKeyOrAddrToSign: [sellerPub],
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        console.log(result)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail the purchase method unit test bit bad payOut.', async () => {
        const tx = new bsv.Transaction()
        const selfOut = new bsv.Transaction.Output({
            script: bsv.Script.fromAddress(sellerAdd),
            satoshis: 1,
        })
        const badOut = new bsv.Transaction.Output({
            script: bsv.Script.fromAddress(sellerAdd),
            satoshis: 1,
        })
        tx.addOutput(selfOut)
        tx.addOutput(badOut)
        tx.change(sellerAdd)
        instance.bindTxBuilder(
            'purchase',
            async (
                current: OrdinalLock,
                options: MethodCallOptions<OrdinalLock>,
                ...args: any
            ): Promise<ContractTransaction> => {
                tx.addInput(current.buildContractInput(options.fromUTXO))

                return {
                    tx,
                    atInputIndex: 0,
                    nexts: [],
                }
            }
        )

        expect(
            instance.methods.purchase(
                toByteString(
                    selfOut.toBufferWriter().toBuffer().toString('hex'),
                    false
                ),
                {
                    pubKeyOrAddrToSign: [sellerPub],
                    fromUTXO: getDummyUTXO(),
                } as MethodCallOptions<OrdinalLock>
            )
        ).to.be.rejectedWith('bad self output')
    })
})
