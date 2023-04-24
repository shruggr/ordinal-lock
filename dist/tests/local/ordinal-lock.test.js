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
    const payOut = new scrypt_ts_1.bsv.Transaction.Output({
        script: scrypt_ts_1.bsv.Script.fromAddress(sellerAdd),
        satoshis: 1000,
    })
        .toBufferWriter()
        .toBuffer();
    let deployTx;
    before(async () => {
        await ordinal_lock_1.OrdinalLock.compile();
        instance = new ordinal_lock_1.OrdinalLock((0, scrypt_ts_1.Ripemd160)(sellerPKH.toString('hex')), payOut.toString('hex'));
        // instance.bindTxBuilder('purchase', OrdinalLock.purchaseTxBuilder)
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
    it('should pass the purchase method unit test successfully.', async () => {
        const tx = new scrypt_ts_1.bsv.Transaction()
            .addOutput(new scrypt_ts_1.bsv.Transaction.Output({
            script: new scrypt_ts_1.bsv.Script(sellerAdd),
            satoshis: instance.balance,
        }))
            //         // build payment output
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(Buffer.from(instance.payOutput, 'hex'))))
            //         // add contract input
            .from({
            txId: deployTx.id,
            outputIndex: 0,
            script: deployTx.outputs[0].script.toString(),
            satoshis: deployTx.outputs[0].satoshis,
        });
        // const asm = `${tx.outputs[0].toBufferWriter().toBuffer().toString('hex')} OP_0 ${tx.getPreimage(0, 0xc1, false)} OP_0`
        // const preimage = tx.pre
        const script = scrypt_ts_1.bsv.Script.fromBuffer(Buffer.alloc(0))
            .add(tx.outputs[0].toBufferWriter().toBuffer())
            .add(scrypt_ts_1.bsv.Opcode.OP_0)
            .add(scrypt_ts_1.bsv.Transaction.Sighash.sighashPreimage(tx, 0xc1, 0, deployTx.outputs[0].script, new scrypt_ts_1.bsv.crypto.BN(deployTx.outputs[0].satoshis), 0x40))
            .add(scrypt_ts_1.bsv.Opcode.OP_0);
        tx.inputs[0].setScript(script);
        // const { tx: callTx, atInputIndex } = await OrdinalLock.purchaseTxBuilder(
        //     instance,
        //     {},
        //     bsv.Script.fromAddress(sellerAdd).toHex()
        // )
        // callTx.from(dummyUTXO)
        // callTx.change(sellerAdd)
        // callTx.inputs[0] = instance.buildContractInput()
        // console.log("callTx: ", JSON.stringify(callTx))
        // await instance.signer.signTransaction(callTx)
        console.log("Tx: ", JSON.stringify(tx));
        const result = tx.verifyScript(0);
        (0, chai_1.expect)(result.success, result.error).to.eq(true);
    });
    it('should fail the purchase method unit test bad payOut.', async () => {
        const badScript = scrypt_ts_1.bsv.Script.fromAddress(badAdd).toHex();
        (0, chai_1.expect)(instance.methods.purchase(badScript, {
            fromUTXO: {
                outputIndex: 0,
                txId: deployTx.id,
                satoshis: deployTx.outputs[0].satoshis,
                script: deployTx.outputs[0].script.toString(),
            },
        })).to.be.rejectedWith('bad self output');
    });
});
//# sourceMappingURL=ordinal-lock.test.js.map