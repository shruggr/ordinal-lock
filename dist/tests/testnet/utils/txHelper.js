"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultSigner = exports.randomPrivateKey = exports.sleep = exports.inputSatoshis = void 0;
const privateKey_1 = require("../../utils/privateKey");
const scrypt_ts_1 = require("scrypt-ts");
exports.inputSatoshis = 10000;
const sleep = async (seconds) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({});
        }, seconds * 1000);
    });
};
exports.sleep = sleep;
function randomPrivateKey() {
    const privateKey = scrypt_ts_1.bsv.PrivateKey.fromRandom('testnet');
    const publicKey = scrypt_ts_1.bsv.PublicKey.fromPrivateKey(privateKey);
    const publicKeyHash = scrypt_ts_1.bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
    const address = publicKey.toAddress();
    return [privateKey, publicKey, publicKeyHash, address];
}
exports.randomPrivateKey = randomPrivateKey;
function getDefaultSigner(privateKey) {
    if (global.testnetSigner === undefined) {
        global.testnetSigner = new scrypt_ts_1.TestWallet(privateKey_1.myPrivateKey, new scrypt_ts_1.DefaultProvider({
            network: scrypt_ts_1.bsv.Networks.testnet,
        }));
    }
    if (privateKey !== undefined) {
        global.testnetSigner.addPrivateKey(privateKey);
    }
    return global.testnetSigner;
}
exports.getDefaultSigner = getDefaultSigner;
//# sourceMappingURL=txHelper.js.map