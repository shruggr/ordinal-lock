import { expect, use } from 'chai'
import {
    bsv,
    buildOpreturnScript,
    findSig,
    MethodCallOptions,
    PubKey,
    Ripemd160,
    SigHash,
    SmartContract,
    toHex,
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
            '',
            {} as MethodCallOptions<OrdinalLock>
        )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should pass the purchase method unit test successfully with changeOutput', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            buyerOut.toString('hex'),
            buyerOut.toString('hex'),
            {} as MethodCallOptions<OrdinalLock>
        )
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should return a partially-signed transaction', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchase(
            buyerOut.toString('hex'),
            '',
            {
                partiallySigned: true,
                autoPayFee: false,
            } as MethodCallOptions<OrdinalLock>
        )
        expect(
            callTx.inputs[atInputIndex].script.toHex(),
            'input script not populated'
        ).to.not.eq('')
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
