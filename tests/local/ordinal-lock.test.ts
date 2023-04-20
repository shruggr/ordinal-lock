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
    // let payOut: bsv.Transaction.Output
    const payScript = bsv.Script.fromAddress(sellerAdd)
    const paySats = 1000n

    beforeEach(async () => {
        await OrdinalLock.compile()

        instance = new OrdinalLock(
            Ripemd160(sellerPKH.toString('hex')),
            payScript.toHex(),
            paySats
        )

        instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)

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
        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            payScript.toHex(),
            {
                fromUTXO: getDummyUTXO(),
                pubKeyOrAddrToSign: [sellerPub],
                changeAddress: sellerAdd,
            } as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail the purchase method unit test bad payOut.', async () => {
        const badScript = bsv.Script.fromAddress(badAdd).toHex()
        expect(
            instance.methods.purchase(badScript, {
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<OrdinalLock>)
        ).to.be.rejectedWith('bad self output')
    })
})
