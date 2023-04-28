import { bsv } from 'scrypt-ts'

const oLockPrefix = bsv.Script.fromHex(
    '2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000'
)
const oLockSuffix = bsv.Script.fromHex(
    '615179547a75537a537a537a0079537a75527a527a7575615579008763567901c161517957795779210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081059795679615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a75517a756169587951797e58797eaa577961007982775179517958947f7551790128947f77517a75517a75618777777777777777777767557951876351795779a9876957795779ac777777777777777767006868'
)

const priv = bsv.PrivateKey.fromWIF('')
const add = priv.toAddress()

const SATS_PER_KB = 50
const INPUT_SIZE = 179

// Payment required to unlock the order
const payOutput = new bsv.Transaction.Output({
    satoshis: 100000000,
    script: bsv.Script.fromAddress(add),
})

function buildListing(ordUtxo, paymentUtxo): bsv.Transaction {
    const tx = new bsv.Transaction()
    tx.from([ordUtxo, paymentUtxo])
    tx.addOutput(
        new bsv.Transaction.Output({
            satoshis: 1,
            script: new bsv.Script('')
                .add(oLockPrefix)
                .add(add.hashBuffer)
                .add(payOutput.toBufferWriter().toBuffer())
                .add(oLockSuffix),
        })
    )
    tx.change(add)

    tx.sign(priv)
    return tx
}

function buildPurchase(listingTx): bsv.Transaction {
    const tx = new bsv.Transaction()

    // listing as input 0
    tx.from([
        {
            txId: listingTx.id,
            outputIndex: 0,
            script: listingTx.outputs[0].script,
            satoshis: listingTx.outputs[0].satoshis,
        },
    ])
    const satsIn = listingTx.outputs[0].satoshis

    // add then new owner as output 0
    tx.addOutput(
        new bsv.Transaction.Output({
            satoshis: 1,
            script: bsv.Script.fromAddress(add),
        })
    )
    let satsOut = 1

    // add the payment output as output 1
    tx.addOutput(payOutput)
    satsOut += payOutput.satoshis

    const preimage = bsv.Transaction.Sighash.sighashPreimage(
        tx,
        bsv.crypto.Signature.SIGHASH_ALL |
            bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
            bsv.crypto.Signature.SIGHASH_FORKID,
        0,
        listingTx.outputs[0].script,
        listingTx.outputs[0].satoshisBN,
        bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
    )
    tx.inputs[0].setScript(
        new bsv.Script('')
            .add(tx.outputs[0].toBufferWriter().toBuffer())
            .add(bsv.Opcode.OP_0)
            .add(preimage)
            .add(bsv.Opcode.OP_0)
    )

    const size = tx.toBuffer().length + INPUT_SIZE
    const satsRequired =
        satsOut - satsIn + Math.ceil((size / 1000) * SATS_PER_KB)

    // Build UTXO with enough sats. Excess will be lost
    // Alternatively, you could use a change output, but that would require rebuilding preimage and including change output as the
    // 2nd push data in the input script for input 0. This can get complicated, so I'm illustrating the easier approach

    // tx.from(paymentUtxo)
    // sign input 1

    return tx
}

function buildCancel(listingTx, paymentUtxo): bsv.Transaction {
    const tx = new bsv.Transaction()
    tx.from([
        {
            txId: listingTx.id,
            outputIndex: 0,
            script: listingTx.outputs[0].script,
            satoshis: listingTx.outputs[0].satoshis,
        },
        paymentUtxo,
    ])

    // add then new owner as output 0
    tx.addOutput(
        new bsv.Transaction.Output({
            satoshis: 1,
            script: bsv.Script.fromAddress(add),
        })
    )

    // sign cancel input
    const sig = bsv.Transaction.Sighash.sign(
        tx,
        priv,
        bsv.crypto.Signature.SIGHASH_SINGLE |
            bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
            bsv.crypto.Signature.SIGHASH_FORKID,
        0,
        listingTx.outputs[0].script,
        listingTx.outputs[0].satoshisBN,
        bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID
    )
    tx.inputs[0].setScript(
        new bsv.Script('')
            .add(sig.toTxFormat())
            .add(priv.publicKey.toBuffer())
            .add(bsv.Opcode.OP_1)
    )

    tx.change(add)
    // sign input 1

    return tx
}
