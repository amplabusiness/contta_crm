// This service SIMULATES all interactions with Google Workspace APIs.
// This is done to avoid errors in environments where a real Google Cloud Client ID is not configured.
import { EmailActivity, Deal, TeamMember, GoogleCalendarEvent } from '../types.ts';

// --- Simulation State ---
let isSignedIn = false;
let authCallback: (() => void) | null = null;

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Simulated Auth Functions ---

/**
 * Simulates the initialization of the Google API client.
 */
export const initGoogleClient = (callback: () => void): void => {
    console.log("Simulating Google Client initialization...");
    authCallback = callback;
    // In this simulation, we consider the client "ready" immediately.
    // The auth status will be updated upon sign-in.
};

/**
 * Checks if the user is currently signed in (simulation).
 */
export const isUserSignedIn = (): boolean => {
    return isSignedIn;
};

/**
 * Simulates the Google Sign-In and consent flow.
 */
export const handleSignIn = (): void => {
    console.log("Simulating Google Sign-In flow...");
    // Simulate user clicking "allow" in a popup
    setTimeout(() => {
        console.log("Sign-in simulation successful.");
        isSignedIn = true;
        if (authCallback) {
            authCallback();
        }
    }, 800);
};

/**
 * Simulates signing the user out.
 */
export const handleSignOut = (): void => {
    console.log("Simulating Google Sign-Out.");
    isSignedIn = false;
    // In a real app, you would also trigger a UI update via a callback
    if (authCallback) {
        authCallback();
    }
};

/**
 * Simulates creating an event in Google Calendar.
 */
export const createCalendarEvent = async (event: GoogleCalendarEvent): Promise<{ id: string }> => {
    if (!isUserSignedIn()) {
        throw new Error("Usuário não está conectado (simulação).");
    }
    console.log("Simulating creation of Google Calendar event:", event);
    await simulateDelay(800);
    // Return a fake event ID
    return { id: `cal-event-${Math.random().toString(36).substring(2, 9)}` };
};


/**
 * Simulates fetching email activities related to CRM deals from the Gmail API.
 */
export const fetchLatestEmails = async (deals: Deal[], team: TeamMember[]): Promise<EmailActivity[]> => {
    if (!isUserSignedIn()) {
        // Silently return empty array if not signed in, as this is for supervision.
        console.warn("Simulated fetch from Gmail API skipped: user not signed in.");
        return [];
    }
    console.log("Simulating fetch from Gmail API for team...");
    await simulateDelay(1500);

    const activities: EmailActivity[] = [];
    deals.slice(0, 7).forEach(deal => { // Simulate emails for some deals
        if (deal.contactEmail && Math.random() > 0.3) {
            const teamMember = team[Math.floor(Math.random() * team.length)];
            const subjects = [
                `Re: Proposta Contábil - ${deal.companyName}`,
                `Dúvidas sobre o contrato de serviços`,
                `Agendamento de Reunião: ${teamMember.name} e ${deal.contactName}`
            ];

            activities.push({
                id: `gmail-${deal.id}-${Math.random()}`,
                from: Math.random() > 0.5 ? teamMember.email : deal.contactEmail,
                to: Math.random() > 0.5 ? deal.contactEmail : teamMember.email,
                subject: subjects[Math.floor(Math.random() * subjects.length)],
                snippet: "Esta é uma simulação de e-mail. Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
                date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
                relatedDealName: deal.companyName,
                teamMemberName: teamMember.name
            });
        }
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return activities;
};