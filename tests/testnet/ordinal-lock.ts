import { OrdinalLock } from '../../src/contracts/ordinal-lock'
import { getDefaultSigner, inputSatoshis } from './utils/txHelper'
import {
    toByteString,
    sha256,
    bsv,
    Ripemd160,
    findSig,
    MethodCallOptions,
    PubKey,
} from 'scrypt-ts'
import {
    myPrivateKey,
    myPublicKey,
    myPublicKeyHash,
    myAddress,
} from '../utils/privateKey'

const payScript = bsv.Script.fromAddress(myAddress).toHex()
const paySats = 1000n

async function main() {
    await OrdinalLock.compile()
    let instance = new OrdinalLock(
        Ripemd160(myPublicKeyHash.toString('hex')),
        payScript,
        paySats
    )
    await instance.connect(getDefaultSigner(myPrivateKey))

    instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)

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
        payScript,
        paySats
    )
    await instance.connect(getDefaultSigner(myPrivateKey))
    instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)

    // contract deployment
    deployTx = await instance.deploy(1)
    console.log('OrdinalLock contract deployed: ', deployTx.id)

    const { tx: purchaseTx } = await instance.methods.purchase(payScript, {
        changeAddress: myAddress,
    } as MethodCallOptions<OrdinalLock>)

    console.log('OrdinalLock contract `purchase` called: ', purchaseTx.id)
}

describe('Test SmartContract `OrdinalLock` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
