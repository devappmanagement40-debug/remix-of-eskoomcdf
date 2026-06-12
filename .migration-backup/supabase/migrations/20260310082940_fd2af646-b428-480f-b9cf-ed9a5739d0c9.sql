-- Attach the insert trigger (auto-debit balance on withdrawal creation)
DROP TRIGGER IF EXISTS on_withdrawal_insert ON public.withdrawals;
CREATE TRIGGER on_withdrawal_insert
  AFTER INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_withdrawal_insert();

-- Attach the status change trigger (auto-refund on rejection)
DROP TRIGGER IF EXISTS on_withdrawal_status_change ON public.withdrawals;
CREATE TRIGGER on_withdrawal_status_change
  BEFORE UPDATE OF status ON public.withdrawals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_withdrawal_status_change();