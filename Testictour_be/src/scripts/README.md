# Tournament Seed Scripts

This directory contains scripts for seeding the database with test data for your tournaments.

## Available Scripts

### `seed.ts`

This script creates a tournament with 128 participants already registered. It's useful for testing tournament mechanics with a full roster of players.

```bash
npm run seed
```

Key features:
- Creates an admin user
- Creates a tournament with 3 phases (elimination, swiss, checkmate)
- Seeds 128 random users and registers them for the tournament
- Adjusts prize structure based on actual participant count

### `seedEmptyTournament.ts`

This script creates an empty tournament with no registered participants. It's useful for testing the registration process.

```bash
npm run seed:empty
```

Key features:
- Creates an admin user (if not exists)
- Creates a tournament with 4 phases (elimination, swiss, elimination, checkmate)
- Sets up rounds for all phases with appropriate timing
- No participants are registered, allowing you to test the registration flow

## Important Notes

- Running these scripts will add data to your database
- The admin user email is always `admin@test.com` with password `password123`
- Both scripts are intended for development/testing purposes only 