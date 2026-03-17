import jwt from "jsonwebtoken";
import { getLevel } from "./levels";

// ============================================================
// Apple Wallet PKPass Generation
// ============================================================
// Apple Wallet requires a signed .pkpass bundle (ZIP of JSON + images).
// For MVP, we generate the pass.json structure. Full signing requires:
// 1. Apple Developer Account ($99/year)
// 2. Pass Type ID certificate from developer.apple.com
// 3. WWDR intermediate certificate
//
// Set these env vars for production:
//   APPLE_PASS_TYPE_ID=pass.com.bandidostrivia.loyalty
//   APPLE_TEAM_ID=YOUR_TEAM_ID
//   APPLE_PASS_CERT_PATH=/path/to/pass-cert.pem
//   APPLE_PASS_KEY_PATH=/path/to/pass-key.pem
//   APPLE_WWDR_CERT_PATH=/path/to/wwdr.pem

export interface PassData {
  serialNumber: string;
  playerName: string;
  points: number;
  rank: number;
  level: string;
  levelEmoji: string;
  profileUrl: string;
}

export function generateApplePassJson(data: PassData) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || "pass.com.bandidostrivia.loyalty",
    serialNumber: data.serialNumber,
    teamIdentifier: process.env.APPLE_TEAM_ID || "PLACEHOLDER",
    organizationName: "Bandidos Trivia",
    description: "Bandidos Trivia Loyalty Card",
    logoText: "Bandidos Trivia",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(196, 30, 58)",
    labelColor: "rgb(255, 215, 0)",
    generic: {
      primaryFields: [
        {
          key: "points",
          label: "POINTS",
          value: data.points,
          changeMessage: "Your points are now %@",
        },
      ],
      secondaryFields: [
        {
          key: "level",
          label: "LEVEL",
          value: `${data.levelEmoji} ${data.level}`,
        },
        {
          key: "rank",
          label: "RANK",
          value: `#${data.rank}`,
        },
      ],
      auxiliaryFields: [
        {
          key: "name",
          label: "PLAYER",
          value: data.playerName,
        },
      ],
      backFields: [
        {
          key: "info",
          label: "About Bandidos Trivia",
          value: "Live trivia every week at Bandidos Mexican Cafe on Franklin St, Chapel Hill NC. Earn points, climb the leaderboard, and become a legend!",
        },
      ],
    },
    barcode: {
      message: data.profileUrl,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    },
    barcodes: [
      {
        message: data.profileUrl,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    ],
  };
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
