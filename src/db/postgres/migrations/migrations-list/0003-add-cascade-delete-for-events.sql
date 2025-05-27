BEGIN;

ALTER TABLE invitees 
DROP CONSTRAINT invitees_event_id_fkey,
ADD CONSTRAINT invitees_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE invitee_uploads 
DROP CONSTRAINT invitee_uploads_event_id_fkey,
ADD CONSTRAINT invitee_uploads_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE invitee_uploads 
DROP CONSTRAINT invitee_uploads_invitee_id_fkey,
ADD CONSTRAINT invitee_uploads_invitee_id_fkey 
FOREIGN KEY (invitee_id) REFERENCES invitees(id) ON DELETE CASCADE;

COMMIT;