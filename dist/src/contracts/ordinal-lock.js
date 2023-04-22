"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdinalLock = void 0;
const scrypt_ts_1 = require("scrypt-ts");
class OrdinalLock extends scrypt_ts_1.SmartContract {
    constructor(seller, payOut) {
        super(...arguments);
        this.seller = seller;
        this.payOut = payOut;
    }
    purchase(buyerScript) {
        (0, scrypt_ts_1.assert)((0, scrypt_ts_1.hash256)(scrypt_ts_1.Utils.buildOutput(buyerScript, this.ctx.utxo.value) +
            this.payOut +
            this.buildChangeOutput()) == this.ctx.hashOutputs, 'bad outputs');
    }
    cancel(sig, pubkey) {
        (0, scrypt_ts_1.assert)(this.seller == (0, scrypt_ts_1.hash160)(pubkey), 'bad seller');
        (0, scrypt_ts_1.assert)(this.checkSig(sig, pubkey), 'signature check failed');
    }
    static purchaseTxBuilder(current, options, buyerScript) {
        const input = current.buildContractInput();
        const unsignedTx = new scrypt_ts_1.bsv.Transaction()
            // add contract input
            .addInput(input)
            // build next instance output
            .addOutput(new scrypt_ts_1.bsv.Transaction.Output({
            script: new scrypt_ts_1.bsv.Script(buyerScript),
            satoshis: current.balance,
        }))
            // build payment output
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(Buffer.from(current.payOut, 'hex'))));
        if (options.changeAddress) {
            // build change output
            unsignedTx.change(options.changeAddress);
        }
        // console.log("callTx: ", JSON.stringify(unsignedTx.toObject(), null, 2))
        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        });
    }
}
__decorate([
    (0, scrypt_ts_1.prop)()
], OrdinalLock.prototype, "seller", void 0);
__decorate([
    (0, scrypt_ts_1.prop)()
], OrdinalLock.prototype, "payOut", void 0);
__decorate([
    (0, scrypt_ts_1.method)(scrypt_ts_1.SigHash.ANYONECANPAY_ALL)
], OrdinalLock.prototype, "purchase", null);
__decorate([
    (0, scrypt_ts_1.method)()
], OrdinalLock.prototype, "cancel", null);
exports.OrdinalLock = OrdinalLock;
//# sourceMappingURL=ordinal-lock.js.map