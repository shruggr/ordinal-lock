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

async function main() {
    await OrdinalLock.compile()
    const payOut = new bsv.Transaction.Output({
        script: bsv.Script.fromAddress(myAddress),
        satoshis: 1000,
    })
        .toBufferWriter()
        .toBuffer()

    const instance = new OrdinalLock(
        Ripemd160(myPublicKeyHash.toString('hex')),
        toByteString(payOut.toString('hex'), false)
    )
    await instance.connect(getDefaultSigner(myPrivateKey))

    // contract deployment
    const deployTx = await instance.deploy(inputSatoshis)
    console.log('OrdinalLock contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await instance.methods.cancel(
        (sigResps) => findSig(sigResps, myPublicKey),
        PubKey(myPublicKey.toString()),
        {
            pubKeyOrAddrToSign: [myPublicKey],
        } as MethodCallOptions<OrdinalLock>
    )

    console.log('OrdinalLock contract `cancel` called: ', callTx.id)
}

describe('Test SmartContract `OrdinalLock` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
