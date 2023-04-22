"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomPrivateKey = exports.getDummyUTXO = exports.getDummySigner = exports.dummyUTXO = exports.inputIndex = exports.inputSatoshis = void 0;
const crypto_1 = require("crypto");
const scrypt_ts_1 = require("scrypt-ts");
const privateKey_1 = require("../../utils/privateKey");
exports.inputSatoshis = 10000;
exports.inputIndex = 0;
exports.dummyUTXO = {
    txId: (0, crypto_1.randomBytes)(32).toString('hex'),
    outputIndex: 0,
    script: '',
    satoshis: exports.inputSatoshis,
};
function getDummySigner(privateKey) {
    if (global.dummySigner === undefined) {
        global.dummySigner = new scrypt_ts_1.TestWallet(privateKey_1.myPrivateKey, new scrypt_ts_1.DummyProvider());
    }
    if (privateKey !== undefined) {
        global.dummySigner.addPrivateKey(privateKey);
    }
    return global.dummySigner;
}
exports.getDummySigner = getDummySigner;
function getDummyUTXO(satoshis = exports.inputSatoshis) {
    return Object.assign({}, exports.dummyUTXO, { satoshis });
}
exports.getDummyUTXO = getDummyUTXO;
function randomPrivateKey() {
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromRandom('testnet');
    const publicKey = scrypt_ts_1.bsv.PublicKey.fromPrivateKey(privateKey);
    const publicKeyHash = scrypt_ts_1.bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
    const address = publicKey.toAddress();
    return [privateKey, publicKey, publicKeyHash, address];
}
exports.randomPrivateKey = randomPrivateKey;
//# sourceMappingURL=txHelper.js.map