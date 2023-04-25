/// <reference types="node" />
import { bsv } from 'scrypt-ts';
export declare function genPrivKey(): void;
export declare function showAddr(privKey: bsv.PrivateKey): void;
export declare const myPrivateKey: bsv.PrivateKey;
export declare const myPublicKey: bsv.PublicKey;
export declare const myPublicKeyHash: Buffer;
export declare const myAddress: bsv.Address;
