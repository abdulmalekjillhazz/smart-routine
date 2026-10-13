# A staff member lost their authenticator

## Confirm who is asking
The request must come from the staff member directly, through a channel you already trust (in person, or a call to a number you have on file). Never reset two-factor for someone who only sent a message.

## Steps (on your own machine, as an owner)
1. npm run reset-mfa -w server -- staff@example.com
   This turns two-factor off, signs them out everywhere, and writes an audit row.
2. The staff member signs in with their password and sets up two-factor again, using a new secret.
3. Check the audit log shows mfa.reset and then mfa.enabled.

## If no owner can do this
Keep a second owner. This is why the rule is at least two owners. If you have only one owner and they are locked out, the database must be changed directly by the person who manages it. Record the change in the incident log.

## Do not
- Do not share a staff member's secret or codes with anyone, including other owners.
