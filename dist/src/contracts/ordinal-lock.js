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
    constructor(seller, payOutput) {
        super(...arguments);
        this.seller = seller;
        this.payOutput = payOutput;
    }
    purchase(selfOutput, trailingOutputs) {
        (0, scrypt_ts_1.assert)((0, scrypt_ts_1.hash256)(selfOutput + this.payOutput + trailingOutputs) ==
            this.ctx.hashOutputs);
    }
    cancel(sig, pubkey) {
        (0, scrypt_ts_1.assert)(this.seller == (0, scrypt_ts_1.hash160)(pubkey), 'bad seller');
        (0, scrypt_ts_1.assert)(this.checkSig(sig, pubkey), 'signature check failed');
    }
    static purchaseTxBuilder(current, options, buyerOutput, changeOutput) {
        const unsignedTx = new scrypt_ts_1.bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))
            // build next instance output
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(Buffer.from(buyerOutput, 'hex'))))
            // build payment output
            .addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(Buffer.from(current.payOutput, 'hex'))));
        if (changeOutput) {
            unsignedTx.addOutput(scrypt_ts_1.bsv.Transaction.Output.fromBufferReader(new scrypt_ts_1.bsv.encoding.BufferReader(Buffer.from(changeOutput, 'hex'))));
        }
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
], OrdinalLock.prototype, "payOutput", void 0);
__decorate([
    (0, scrypt_ts_1.method)(scrypt_ts_1.SigHash.ANYONECANPAY_ALL)
], OrdinalLock.prototype, "purchase", null);
__decorate([
    (0, scrypt_ts_1.method)()
], OrdinalLock.prototype, "cancel", null);
exports.OrdinalLock = OrdinalLock;
//# sourceMappingURL=ordinal-lock.js.map