import { OrdinalLock } from '../../src/contracts/ordinal-lock'
import { getDefaultSigner, randomPrivateKey } from './utils/txHelper'
import {
    bsv,
    Ripemd160,
    findSig,
    MethodCallOptions,
    PubKey,
    buildOpreturnScript,
    toHex,
    DefaultProvider,
    TestWallet,
} from 'scrypt-ts'
import {
    myPrivateKey,
    myPublicKey,
    myPublicKeyHash,
    myAddress,
} from '../utils/privateKey'

const payScript = bsv.Script.fromAddress(myAddress)
// const paySats = 1000n
const payOut = new bsv.Transaction.Output({
    script: payScript,
    satoshis: 1000,
})
    .toBufferWriter()
    .toBuffer()

async function main() {
    await OrdinalLock.compile()
    let instance = new OrdinalLock(
        Ripemd160(myPublicKeyHash.toString('hex')),
        payOut.toString('hex')
    )
    await instance.connect(getDefaultSigner(myPrivateKey))

    // contract deployment
    let deployTx = await instance.deploy(1)
    console.log('OrdinalLock contract deployed: ', deployTx.id)

    // contract call
    const { tx: cancelTx } = await instance.methods.cancel(
        (sigResps) => findSig(sigResps, myPublicKey),
        PubKey(myPublicKey.toString()),
        {
            pubKeyOrAddrToSign: [myPublicKey],
        } as MethodCallOptions<OrdinalLock>
    )
    console.log('OrdinalLock contract `cancel` called: ', cancelTx.id)

    instance = new OrdinalLock(
        Ripemd160(myPublicKeyHash.toString('hex')),
        payOut.toString('hex')
    )
    await instance.connect(getDefaultSigner(myPrivateKey))
    instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)

    // contract deployment
    deployTx = await instance.deploy(1)
    console.log('OrdinalLock contract deployed: ', deployTx.id)

    const selfOutput = toHex(
        new bsv.Transaction.Output({
            script: new bsv.Script(myAddress),
            satoshis: instance.balance,
        })
            .toBufferWriter()
            .toBuffer()
    )

    const trailingOutputs = toHex(
        new bsv.Transaction.Output({
            script: buildOpreturnScript('00'),
            satoshis: instance.balance,
        })
            .toBufferWriter()
            .toBuffer()
    )

    const { tx: callTx, atInputIndex } = await instance.methods.purchase(
        selfOutput,
        trailingOutputs,
        {
            pubKeyOrAddrToSign: [myPublicKey],
            partiallySigned: true,
            autoPayFee: false,
        } as MethodCallOptions<OrdinalLock>
    )
    const result = callTx.verifyScript(atInputIndex)

    console.log('OrdinalLock contract `purchase` called: ', result)

    const needSatoshiAsFee =
        callTx.outputAmount + callTx.getEstimateFee() + callTx.inputAmount

    console.log('needSatoshiAsFee', needSatoshiAsFee)

    // now you have a partially Signed tx, send this tx to user , then user add a input, and sign it

    const userPrivateKey = bsv.PrivateKey.fromWIF(
        'cS98v9dfvPsLUcpriCpiRw3tZ65sp77XjDr5ZJtnXUvQKHQiqtQL'
    )

    const userSigner = new TestWallet(
        userPrivateKey,
        new DefaultProvider({
            network: bsv.Networks.testnet,
        })
    )

    const utxos = await userSigner.listUnspent(userPrivateKey.toAddress(), {
        minSatoshis: needSatoshiAsFee,
    })

    // add p2pkh input to pay fee
    callTx.from(utxos)

    console.log('utxos', utxos)

    // only sign p2pkh input
    await userSigner.signTransaction(callTx)

    console.log('check fee', callTx.getFee(), callTx.getEstimateFee())

    await userSigner.provider.sendTransaction(callTx)

    console.log('OrdinalLock contract `purchase` called: ', callTx.id)
}

describe('Test SmartContract `OrdinalLock` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
