"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myAddress = exports.myPublicKeyHash = exports.myPublicKey = exports.myPrivateKey = exports.showAddr = exports.genPrivKey = void 0;
const scrypt_ts_1 = require("scrypt-ts");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const dotenvConfigPath = '.env';
dotenv.config({ path: dotenvConfigPath });
// fill in private key on testnet in WIF here
let privKey = process.env.PRIVATE_KEY;
if (!privKey) {
    genPrivKey();
}
else {
    showAddr(scrypt_ts_1.bsv.PrivateKey.fromWIF(privKey));
}
function genPrivKey() {
    const newPrivKey = scrypt_ts_1.bsv.PrivateKey.fromRandom('testnet');
    console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from the sCrypt faucet https://scrypt.io/faucet`);
    // auto generate .env file with new generated key
    fs.writeFileSync(dotenvConfigPath, `PRIVATE_KEY="${newPrivKey}"`);
    privKey = newPrivKey.toWIF();
}
exports.genPrivKey = genPrivKey;
function showAddr(privKey) {
    console.log(`Private key already present ...
You can fund its address '${privKey.toAddress()}' from the sCrypt faucet https://scrypt.io/faucet`);
}
exports.showAddr = showAddr;
exports.myPrivateKey = scrypt_ts_1.bsv.PrivateKey.fromWIF(privKey);
exports.myPublicKey = scrypt_ts_1.bsv.PublicKey.fromPrivateKey(exports.myPrivateKey);
exports.myPublicKeyHash = scrypt_ts_1.bsv.crypto.Hash.sha256ripemd160(exports.myPublicKey.toBuffer());
exports.myAddress = exports.myPublicKey.toAddress();
//# sourceMappingURL=privateKey.js.map