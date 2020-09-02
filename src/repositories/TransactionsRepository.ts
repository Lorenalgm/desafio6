import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface Response {
  transactions: Transaction[];
  balance: Balance;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Response> {
    const transactions = await this.find();

    const income = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        return acc + transaction.value;
      }

      return acc;
    }, 0);

    const outcome = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'outcome') {
        return acc + transaction.value;
      }

      return acc;
    }, 0);

    const total = income - outcome;

    return {
      transactions,
      balance: { income, outcome, total },
    };
  }
}

export default TransactionsRepository;
