import type { Request, Response } from 'express';
import type { Email } from '../interfaces/emails.interfaces';
import { emailService } from '../server';

export const emailController = async (req: Request, res: Response) => {
    const emailData: Email = req.body;
    if (!emailData || !emailData.to || !emailData.subject) {
        res.status(400).json({ error: 'Invalid email data provided.' });
        return;
    }

    const emailResult = await emailService.sendEmail(emailData)
    res.status(200).json({
        message: "Email controller is working",
        results: emailResult
    });
}