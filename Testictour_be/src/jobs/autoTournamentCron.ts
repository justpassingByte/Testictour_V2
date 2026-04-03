import cron from 'node-cron';
import { prisma } from '../services/prisma';
import TournamentService from '../services/TournamentService';

// Run every day at 8am
cron.schedule('0 8 * * *', async () => {
  const templates = await prisma.tournamentTemplate.findMany({});
  for (const template of templates) {
    // Only create if no tournament for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate tournament start time based on template's startTime string and today's date
    const [hours, minutes] = template.startTime.split(':').map(Number);
    const tournamentStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);

    // Calculate registration deadline (e.g., 1 hour before startTime, or 5 mins from now if in past)
    const registrationDeadline = new Date(tournamentStartTime.getTime());
    registrationDeadline.setHours(registrationDeadline.getHours() - 1); // Default to 1 hour before start

    const now = new Date();
    if (registrationDeadline.getTime() < now.getTime()) {
      // If the calculated deadline is in the past, set it to 5 minutes from now
      registrationDeadline.setTime(now.getTime() + 5 * 60 * 1000);
    }

    const exists = await prisma.tournament.findFirst({
      where: {
        templateId: template.id,
        // Check if a tournament from this template already exists for today's calculated start time
        startTime: tournamentStartTime
      }
    });
    if (!exists) {
      const newTournament = await TournamentService.create({
        name: template.name + ' ' + new Date().toLocaleDateString(), // Use current date for naming
        startTime: tournamentStartTime, // Use the calculated start time
        maxPlayers: template.maxPlayers,
        entryFee: template.entryFee,
        organizerId: template.createdById,
        registrationDeadline: registrationDeadline, // Add the calculated registration deadline
        templateId: template.id,
        prizeStructure: template.prizeStructure,
        hostFeePercent: template.hostFeePercent,
        expectedParticipants: template.expectedParticipants,
      });
      console.log('Auto-created tournament from template', template.name, 'for', tournamentStartTime.toLocaleString());
    }
  }
}); 