import {
    clusterApiUrl,
    Connection,
    PublicKey,
    Keypair
} from "@solana/web3.js";
import { 
    TOKEN_PROGRAM_ID, 
    TOKEN_2022_PROGRAM_ID, 
    burn, 
    harvestWithheldTokensToMint, 
    closeAccount
} from "@solana/spl-token";
import bs58 from "bs58";
import * as dotenv from "dotenv";


dotenv.config();

const PRIV_KEY = process.env.PRIV_KEY || "";


(async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const owner = Keypair.fromSecretKey(bs58.decode(PRIV_KEY));
    console.log('Public key of owner:', owner.publicKey.toBase58());
    console.log('');

    const programId = /* TOKEN_PROGRAM_ID */ TOKEN_2022_PROGRAM_ID;

    // Get all token accounts of wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner.publicKey, { programId: programId });

    for (const tokenAccount of tokenAccounts.value) {
        let txhash = "";

        // console.log('tokenAccount.account.data.parsed.info:', tokenAccount.account.data.parsed.info);

        // Burn tokens if remaining
        if (tokenAccount.account.data.parsed.info.tokenAmount.uiAmount > 0) {
            txhash = await burn(
                connection, // connection
                owner, // payer
                tokenAccount.pubkey, // token account which you want to burn from
                new PublicKey(tokenAccount.account.data.parsed.info.mint), // mint
                owner.publicKey, // owner
                BigInt(tokenAccount.account.data.parsed.info.tokenAmount.amount), // amount
                undefined, // multiSigners
                undefined, // confirmOptions
                programId // programId
            );
            console.log(`BurnTokens txhash: ${txhash}`);
        }

        if (programId === TOKEN_2022_PROGRAM_ID 
            && tokenAccount.account.data.parsed.info.extensions[1].extension === 'transferFeeAmount' 
            && tokenAccount.account.data.parsed.info.extensions[1].state.withheldAmount > 0) {
            txhash = await harvestWithheldTokensToMint(
                connection, // connection
                owner, // payer
                new PublicKey(tokenAccount.account.data.parsed.info.mint), // mint
                [tokenAccount.pubkey], // sources
                undefined, // confirmOptions
                programId // programId
            );
            console.log(`HarvestWithheldTokens txhash: ${txhash}`);
        }

        txhash = await closeAccount(
            connection, // connection
            owner, // payer
            tokenAccount.pubkey, // token account which you want to close
            owner.publicKey, // destination
            owner, // owner of token account
            undefined, // multiSigners
            undefined, // confirmOptions
            programId // programId
        );
        console.log(`CloseAccount txhash: ${txhash}`);
        console.log('');
    }
})();
