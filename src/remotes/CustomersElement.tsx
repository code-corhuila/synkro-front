import { createElement, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { customersContract } from '../shell/customersContract';
import type { ShellContract } from '../shell/shell-contract';

export function CustomersElement({ tag }: { tag: string }) {
  const [failure, setFailure] = useState<Error | null>(null);
  const navigate = useNavigate();
  useLocation();
  // Reassign on location changes: Angular synchronizes its inner Router without
  // writing history. The element itself is preserved during inner navigation.
  const contract = customersContract(navigate);
  const ref = useCallback((node: (HTMLElement & { shellContract: ShellContract }) | null) => {
    if (node) {
      const onFailure = () => setFailure(new Error('Customers bootstrap failed'));
      node.addEventListener('portal-error', onFailure);
      node.shellContract = contract;
      return () => node.removeEventListener('portal-error', onFailure);
    }
  }, [contract]);
  if (failure) throw failure;
  return createElement(tag, { ref });
}
