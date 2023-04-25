/// <reference types="node" />
import { TestWallet, UTXO, bsv } from 'scrypt-ts';
export declare const inputSatoshis = 10000;
export declare const inputIndex = 0;
export declare const dummyUTXO: {
    txId: string;
    outputIndex: number;
    script: string;
    satoshis: number;
};
export declare function getDummySigner(privateKey?: bsv.PrivateKey | bsv.PrivateKey[]): TestWallet;
export declare function getDummyUTXO(satoshis?: number): UTXO;
export declare function randomPrivateKey(): readonly [bsv.PrivateKey, bsv.PublicKey, Buffer, bsv.Address];
