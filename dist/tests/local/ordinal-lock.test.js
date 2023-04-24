"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const scrypt_ts_1 = require("scrypt-ts");
const ordinal_lock_1 = require("../../src/contracts/ordinal-lock");
const txHelper_1 = require("./utils/txHelper");
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
(0, chai_1.use)(chai_as_promised_1.default);
const [sellerPriv, sellerPub, sellerPKH, sellerAdd] = (0, txHelper_1.randomPrivateKey)();
const [badPriv, badPub, badPKH, badAdd] = (0, txHelper_1.randomPrivateKey)();
describe('Test SmartContract `OrdinalLock`', () => {
    let instance;
    const sellerScript = scrypt_ts_1.bsv.Script.fromAddress(sellerAdd);
    const payOut = new scrypt_ts_1.bsv.Transaction.Output({
        script: sellerScript,
        satoshis: 1000,
    })
        .toBufferWriter()
        .toBuffer();
    const buyerOut = new scrypt_ts_1.bsv.Transaction.Output({
        script: sellerScript,
        satoshis: 1,
    })
        .toBufferWriter()
        .toBuffer();
    let deployTx;
    before(async () => {
        await ordinal_lock_1.OrdinalLock.compile();
        instance = new ordinal_lock_1.OrdinalLock((0, scrypt_ts_1.Ripemd160)(sellerPKH.toString('hex')), payOut.toString('hex'));
        instance.bindTxBuilder('purchase', ordinal_lock_1.OrdinalLock.purchaseTxBuilder);
        instance.bindTxBuilder('purchaseWithChange', ordinal_lock_1.OrdinalLock.purchaseWithChangeTxBuilder);
        await instance.connect((0, txHelper_1.getDummySigner)([sellerPriv]));
        deployTx = await instance.deploy(1);
        console.log('OrdinalLock contract deployed: ', deployTx.id);
    });
    it('should pass the cancel method unit test successfully.', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.cancel((sigResps) => (0, scrypt_ts_1.findSig)(sigResps, sellerPub), (0, scrypt_ts_1.PubKey)(sellerPub.toString()), {
            pubKeyOrAddrToSign: [sellerPub],
        });
        const result = callTx.verifyScript(atInputIndex);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should fail the cancel method unit test with bad seller.', async () => {
        (0, chai_1.expect)(instance.methods.cancel((sigResps) => (0, scrypt_ts_1.findSig)(sigResps, sellerPub), (0, scrypt_ts_1.PubKey)(badPub.toString()), {
            pubKeyOrAddrToSign: [sellerPub],
        })).to.be.rejectedWith('bad seller');
    });
    it('should fail the cancel method unit test with signature check failed.', async () => {
        (0, chai_1.expect)(instance.methods.cancel((sigResps) => (0, scrypt_ts_1.findSig)(sigResps, badPub), (0, scrypt_ts_1.PubKey)(sellerPub.toString()), {
            pubKeyOrAddrToSign: [badPub],
        })).to.be.rejectedWith('signature check failed');
    });
    it('should pass the purchase method unit test successfully', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchase(buyerOut.toString('hex'), {});
        const result = callTx.verifyScript(atInputIndex);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should pass the purchaseWithChange method unit test successfully with change', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchaseWithChange(buyerOut.toString('hex'), { changeAddress: sellerAdd });
        const result = callTx.verifyScript(atInputIndex);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should pass the purchaseWithChange method unit test successfully without change', async () => {
        const { tx: callTx, atInputIndex } = await instance.methods.purchaseWithChange(buyerOut.toString('hex'), {});
        const result = callTx.verifyScript(atInputIndex);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should return a partially-signed transaction', async () => {
        const { tx: callTx, atInputIndex } = await ordinal_lock_1.OrdinalLock.purchaseTxBuilder(instance, {}, buyerOut.toString('hex'));
        (0, chai_1.expect)(callTx.inputs[0].script.toHex(), "input script populated").to.eq("");
        instance.signer.signTransaction(callTx);
        (0, chai_1.expect)(callTx.inputs[0].script.toHex(), "input script not populated").to.not.eq("");
    });
    it('should pass the purchase method unit test successfully.', async () => {
        const tx = new scrypt_ts_1.bsv.Transaction()
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(buyerOut)))
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(payOut)))
            .from({
            txId: deployTx.id,
            outputIndex: 0,
            script: deployTx.outputs[0].script.toHex(),
            satoshis: deployTx.outputs[0].satoshis,
        });
        // .from(dummyUTXO)
        // .change(sellerAdd)
        // build input first time to get size in order to properly calculate fee/change
        let preimage = scrypt_ts_1.bsv.Transaction.Sighash.sighashPreimage(tx, 0xc1, 0, deployTx.outputs[0].script, new scrypt_ts_1.bsv.crypto.BN(deployTx.outputs[0].satoshis), scrypt_ts_1.bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID);
        tx.inputs[0].setScript(scrypt_ts_1.bsv.Script.fromBuffer(Buffer.alloc(0))
            .add(buyerOut)
            .add(preimage)
            .add(scrypt_ts_1.bsv.Opcode.OP_0));
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
        const result = tx.verifyScript(0);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should fail the purchase method unit test bad payOut.', async () => {
        const badScript = scrypt_ts_1.bsv.Script.fromAddress(badAdd).toHex();
        (0, chai_1.expect)(instance.methods.purchase(badScript, {})).to.be.rejectedWith('bad self output');
    });
});
//# sourceMappingURL=ordinal-lock.test.js.map