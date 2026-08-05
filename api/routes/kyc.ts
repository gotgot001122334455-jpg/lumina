import { Router } from 'express';
import prisma from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { sendEmail, templates } from '../utils/mailer';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer: Buffer, filename: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'lumina-bank-kyc',
        public_id: filename.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, ''),
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload result is undefined'));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', authenticate, upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'proof', maxCount: 1 }
]), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Construct paths payload
    const documentDataObj: Record<string, string> = {};
    if (files) {
      for (const key of ['front', 'back', 'selfie', 'proof']) {
        if (files[key] && files[key][0]) {
          const file = files[key][0];
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `${key}-${uniqueSuffix}-${file.originalname}`;
          
          try {
            console.log(`Uploading ${key} to Cloudinary...`);
            const secureUrl = await uploadToCloudinary(file.buffer, filename);
            documentDataObj[key] = secureUrl;
          } catch (uploadErr) {
            console.error(`Cloudinary upload failed for ${key}:`, uploadErr);
            // Fallback mock path if Cloudinary is not configured in .env (for easier development/fallback)
            if (!process.env.CLOUDINARY_API_KEY) {
              console.warn('Cloudinary API key missing. Saving local mock path.');
              documentDataObj[key] = `/mock-uploads/${filename}`;
            } else {
              throw uploadErr;
            }
          }
        }
      }
    }
    
    // Add any text fields if they were passed (like first name, last name, DOB, address, questionnaire fields)
    const mergedData = {
      ...req.body,
      ...documentDataObj
    };

    const documentData = JSON.stringify(mergedData);

    // Check if pending KYC exists
    const existingKyc = await prisma.kycRequest.findFirst({
      where: { userId, status: 'PENDING' }
    });
    if (existingKyc) {
      return res.status(400).json({ error: 'KYC request already pending' });
    }

    // Generate 8-digit unique account number if not already present
    let accountNumber = user.accountNumber;
    let generatedNew = false;
    if (!accountNumber) {
      let isUnique = false;
      while (!isUnique) {
        accountNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
        const exists = await prisma.user.findUnique({ where: { accountNumber } });
        if (!exists) isUnique = true;
      }
      generatedNew = true;
    }

    const { annualIncome, accountType, sourceOfIncome } = req.body;

    // Update user record with generated account number, questionnaire details, and kycStatus
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountNumber,
        annualIncome,
        accountType,
        sourceOfIncome,
        kycStatus: 'PENDING'
      }
    });

    const kycRequest = await prisma.kycRequest.create({
      data: {
        userId,
        documentData,
        status: 'PENDING'
      }
    });

    // Send welcome email with generated account details
    if (generatedNew) {
      try {
        await sendEmail(user.email, 'Welcome to Lumina Bank', templates.welcome(user.fullName, accountNumber));
      } catch (emailErr) {
        console.error('Welcome email failed to send:', emailErr);
      }
    }

    res.json({ kycRequest });
  } catch (error) {
    console.error('Error in KYC submit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    res.json({ kycStatus: user?.kycStatus });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
