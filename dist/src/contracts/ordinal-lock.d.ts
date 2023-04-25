import { ByteString, PubKey, PubKeyHash, SmartContract, Sig, MethodCallOptions, ContractTransaction } from 'scrypt-ts';
export declare class OrdinalLock extends SmartContract {
    seller: PubKeyHash;
    payOutput: ByteString;
    constructor(seller: PubKeyHash, payOutput: ByteString);
    purchase(selfOutput: ByteString, trailingOutputs: ByteString): void;
    cancel(sig: Sig, pubkey: PubKey): void;
    static purchaseTxBuilder(current: OrdinalLock, options: MethodCallOptions<OrdinalLock>, buyerOutput: ByteString, changeOutput: ByteString): Promise<ContractTransaction>;
}
