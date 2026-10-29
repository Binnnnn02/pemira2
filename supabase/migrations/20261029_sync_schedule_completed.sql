-- Saat penilaian disubmit (oleh pewawancara lewat RPC submit_assessment),
-- tandai jadwal wawancara terkait sebagai 'completed'.
-- Pewawancara tidak punya hak UPDATE pada interview_schedules (RLS), jadi dilakukan via trigger SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.mark_schedule_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') THEN
        UPDATE public.interview_schedules
        SET status = 'completed', updated_at = timezone('utc'::text, now())
        WHERE assignment_id = NEW.assignment_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_schedule_completed ON public.assessments;
CREATE TRIGGER trg_mark_schedule_completed
    AFTER UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_schedule_completed();
