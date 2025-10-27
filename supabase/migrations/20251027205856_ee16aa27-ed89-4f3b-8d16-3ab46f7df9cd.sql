-- Add connected_device_id to teams table to track connected devices
ALTER TABLE public.teams 
ADD COLUMN connected_device_id text;

-- Add comment to explain the column
COMMENT ON COLUMN public.teams.connected_device_id IS 'Unique device ID of the connected smartphone. Only one device can connect per team.';