const { P2PKHAddress, Script, SigHash, Transaction, TxIn, TxOut } = require('bsv-wasm');
require('dotenv').config();

const SAT_FEE_PER_BYTE = 0.1;

const oLockPrefix = '2097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c0000';
const oLockSuffix = '615179547a75537a537a537a0079537a75527a527a7575615579008763567901c161517957795779210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081059795679615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a75517a756169587951797e58797eaa577961007982775179517958947f7551790128947f77517a75517a75618777777777777777777767557951876351795779a9876957795779ac777777777777777767006868';

const signPayment = (tx, paymentPK, inputIdx, paymentUtxo, utxoIn) => {
  const sig2 = tx.sign(
    paymentPK,
    SigHash.ALL | SigHash.FORKID,
    inputIdx,
    Script.from_asm_string(paymentUtxo.script),
    BigInt(paymentUtxo.satoshis)
  );
  utxoIn.set_unlocking_script(
      Script.from_asm_string(
        `${sig2.to_hex()} ${paymentPK.to_public_key().to_hex()}`
      )
  );
  return utxoIn;
}

const createChangeOutput = (tx, changeAddress, paymentSatoshis) => {
  const changeaddr = P2PKHAddress.from_string(changeAddress);
  const changeScript = changeaddr.get_locking_script();
  const emptyOut = new TxOut(BigInt(1), changeScript);
  const fee = Math.ceil(SAT_FEE_PER_BYTE * (tx.get_size() + emptyOut.to_bytes().byteLength));
  const change = paymentSatoshis - fee;
  const changeOut = new TxOut(BigInt(change), changeScript);
  return changeOut;
}

const listOrdinal = async (
  paymentUtxo,
  ordinal,
  paymentPk,
  changeAddress,
  ordPk,
  ordAddress,
  payoutAddress,
  satoshisPayout
) => {
  let tx = new Transaction(1, 0);

  let ordIn = new TxIn(
    Buffer.from(ordinal.txid, "hex"),
    ordinal.vout,
    Script.from_asm_string("")
  );
  tx.add_input(ordIn);

  // Inputs
  let utxoIn = new TxIn(
    Buffer.from(paymentUtxo.txid, "hex"),
    paymentUtxo.vout,
    Script.from_asm_string("")
  );

  tx.add_input(utxoIn);

  const payoutDestinationAddress = P2PKHAddress.from_string(payoutAddress);
  const payOutput = new TxOut(BigInt(satoshisPayout), payoutDestinationAddress.get_locking_script());

  const destinationAddress = P2PKHAddress.from_string(ordAddress);
  const addressHex = destinationAddress.get_locking_script().to_asm_string().split(' ')[2];

  const ordLockScript = `${Script.from_hex(oLockPrefix).to_asm_string()} ${addressHex} ${payOutput.to_hex()} ${Script.from_hex(oLockSuffix).to_asm_string()}`;

  let satOut = new TxOut(BigInt(1), Script.from_asm_string(ordLockScript));
  tx.add_output(satOut);

  const changeOut = createChangeOutput(tx, changeAddress, paymentUtxo.satoshis);
  tx.add_output(changeOut);

  // sign ordinal
  const sig = tx.sign(
    ordPk,
    SigHash.ALL | SigHash.FORKID,
    0,
    Script.from_asm_string(ordinal.script),
    BigInt(ordinal.satoshis)
  );

  ordIn.set_unlocking_script(
    Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()}`)
  );

  tx.set_input(0, ordIn);

  utxoIn = signPayment(tx, paymentPk, 1, paymentUtxo, utxoIn);
  tx.set_input(1, utxoIn);

  return tx;
};

const cancelOrdinal = async(listingTxid, listingUtxo, ordPk, paymentUtxo, paymentPk, toAddress, changeAddress) => {
  const listingTx = new Transaction(1, 0);
  let ordIn = new TxIn(Buffer.from(listingTxid, "hex"), 0, Script.from_asm_string(""));
  listingTx.add_input(ordIn);

  let utxoIn = new TxIn(Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, Script.from_asm_string(""));
  listingTx.add_input(utxoIn);

  const destinationAddress = P2PKHAddress.from_string(toAddress);
  const satOut = new TxOut(BigInt(1), destinationAddress.get_locking_script());
  listingTx.add_output(satOut);

  const changeOut = addChangeOutput(listingTx, changeAddress, paymentUtxo.satoshis);
  listingTx.add_output(changeOut);

  // sign listing to cancel
  const sig = listingTx.sign(
      ordPk,
      SigHash.SINGLE | SigHash.ANYONECANPAY | SigHash.FORKID,
      0,
      Script.from_asm_string(listingUtxo.script),
      BigInt(listingUtxo.satoshis)
  );
  
  ordIn.set_unlocking_script(
      Script.from_asm_string(`${sig.to_hex()} ${ordPk.to_public_key().to_hex()} OP_1`)
  );

  listingTx.set_input(0, ordIn);

  utxoIn = signPayment(listingTx, paymentPk, 1, paymentUtxo, utxoIn);
  listingTx.set_input(1, utxoIn);
  
  return listingTx;
}

const buyOrdinal = async(listingUtxo, paymentUtxo, paymentPk, toAddress, changeAddress = null, payForTransaction = true) => {
  const listingTx = new Transaction(1, 0);

  let ordIn = new TxIn(Buffer.from(listingUtxo.txid, "hex"), listingUtxo.vout, Script.from_asm_string(""));
  listingTx.add_input(ordIn);

  const destinationAddress = P2PKHAddress.from_string(toAddress);
  const satOut = new TxOut(BigInt(1), destinationAddress.get_locking_script());
  listingTx.add_output(satOut);

  const payOutputHex = listingUtxo.script.split(' ')[6];
  const payOut = TxOut.from_hex(payOutputHex);
  listingTx.add_output(payOut);

  if (changeAddress !== null) {
      const changeOut = addChangeOutput(listingTx, changeAddress, paymentUtxo.satoshis);
      listingTx.add_output(changeOut);
  }

  const preimage = listingTx.sighash_preimage(
    SigHash.ALL | SigHash.ANYONECANPAY | SigHash.FORKID,
    0,
    Script.from_asm_string(listingUtxo.script),
    BigInt(listingUtxo.satoshis)
  )

  ordIn.set_unlocking_script(
      Script.from_asm_string(`${satOut.to_hex()} ${changeAddress !== null ? changeOut.to_hex() : 'OP_0'} ${Buffer.from(preimage).toString('hex')} OP_0`)
  );

  listingTx.set_input(0, ordIn);

  let utxoIn = new TxIn(Buffer.from(paymentUtxo.txid, "hex"), paymentUtxo.vout, Script.from_asm_string(paymentUtxo.script));
  listingTx.add_input(utxoIn);

  if (payForTransaction) {
    utxoIn = signPayment(listingTx, paymentPk, 1, paymentUtxo, utxoIn);
    listingTx.set_input(1, utxoIn);
  }
  
  return listingTx;
}

exports.listOrdinal = listOrdinal;
exports.cancelOrdinal = cancelOrdinal;
exports.buyOrdinal = buyOrdinal;