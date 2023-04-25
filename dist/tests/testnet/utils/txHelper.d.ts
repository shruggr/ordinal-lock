/// <reference types="node" />
import { bsv, TestWallet } from 'scrypt-ts';
export declare const inputSatoshis = 10000;
export declare const sleep: (seconds: number) => Promise<unknown>;
export declare function randomPrivateKey(): readonly [bsv.PrivateKey, bsv.PublicKey, Buffer, bsv.Address];
export declare function getDefaultSigner(privateKey?: bsv.PrivateKey | bsv.PrivateKey[]): TestWallet;
