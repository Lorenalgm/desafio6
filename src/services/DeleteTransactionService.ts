import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

interface Request {
  transaction_id: string;
}

class DeleteTransactionService {
  public async execute({ transaction_id: id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);

    const transaction = await transactionsRepository.findOne(id);

    if (!transaction) {
      throw new AppError('Transaction does not found');
    }

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
