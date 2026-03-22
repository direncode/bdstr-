import jwt from "jsonwebtoken";
import { getLevel } from "./levels";

export interface PassData {
  serialNumber: string;
  playerName: string;
  points: number;
  rank: number;
  level: string;
  levelEmoji: string;
  profileUrl: string;
}

// ============================================================
// Google Wallet Loyalty Card
// ============================================================
// Requires:
// 1. Google Cloud project with Google Wallet API enabled
// 2. Service account with "Google Wallet API – Writer" role
// 3. Issuer ID from pay.google.com/business/console
//
// Set these env vars:
//   GOOGLE_WALLET_ISSUER_ID=your-issuer-id
//   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com
//   GOOGLE_WALLET_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...

const GOOGLE_WALLET_CLASS_ID = "bandidosTriviaLoyalty";

export function getGoogleWalletClassId() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || "PLACEHOLDER_ISSUER";
  return `${issuerId}.${GOOGLE_WALLET_CLASS_ID}`;
}

export function generateGoogleWalletSaveUrl(data: PassData): string | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!issuerId || !email || !privateKey) {
    return null; // Not configured — return null so UI can show setup instructions
  }

  const classId = getGoogleWalletClassId();
  const objectId = `${issuerId}.player_${data.serialNumber}`;
  const level = getLevel(data.points);

  const loyaltyObject = {
    id: objectId,
    classId: classId,
    state: "ACTIVE",
    accountId: data.serialNumber,
    accountName: data.playerName,
    loyaltyPoints: {
      label: "Points",
      balance: {
        int: data.points,
      },
    },
    barcode: {
      type: "QR_CODE",
      value: data.profileUrl,
    },
    textModulesData: [
      {
        header: "Level",
        body: `${level.emoji} ${level.name}`,
      },
      {
        header: "Rank",
        body: `#${data.rank}`,
      },
    ],
    heroImage: {
      sourceUri: {
        uri: "https://bandidoscafe.com/wp-content/uploads/2023/06/bandidos-logo.png",
      },
    },
  };

  const claims = {
    iss: email,
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const token = jwt.sign(claims, privateKey, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

// Google Wallet loyalty class definition (create once via API)
export function getGoogleWalletClassDefinition() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || "PLACEHOLDER";
  return {
    id: `${issuerId}.${GOOGLE_WALLET_CLASS_ID}`,
    issuerName: "Bandidos Trivia",
    programName: "Bandidos Trivia Empire",
    programLogo: {
      sourceUri: {
        uri: "https://bandidoscafe.com/wp-content/uploads/2023/06/bandidos-logo.png",
      },
    },
    hexBackgroundColor: "#C41E3A",
    reviewStatus: "UNDER_REVIEW",
    localizedIssuerName: {
      defaultValue: {
        language: "en-US",
        value: "Bandidos Mexican Cafe",
      },
    },
  };
}
