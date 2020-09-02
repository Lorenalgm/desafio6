import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParser from 'csv-parse';
import fs from 'fs';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filePath: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const contactsReadStream = fs.createReadStream(filePath);
    // Será a stream que estará lendo nossos arquivos

    const parsers = csvParser({
      // delimiter: ';', Originalmente é separada por vírgulas, mas é possível alterar o delimitador
      fromLine: 2, // O CSVParser, considera a primeira linha (geralmente os títulos das colunas, header) como dados.
    });

    const parseCSV = contactsReadStream.pipe(parsers);
    // O pipe significa que a aplicação irá lendo as linhas conforme vão sendo disponibilizadas (streaming)

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    // Primeiro parâmetro é o nome do evento
    parseCSV.on('data', async line => {
      // cada parâmetro de line desestruturaremos os valores contidos no CSV
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // O parseCSV não ocorre em tempo real, ou seja, ele não é sincrono.
    // console.log(categories); // Retorna vazio

    // Então criamos uma nova promise que irá resolver para nós, aguardando que
    // o csvParser emtiu um evento chamado 'end'. Ou seja, quando o evendo 'end'
    // for emitido ele irá retornar o esperado.
    await new Promise(resolve => parseCSV.on('end', resolve));
    // console.log(categories);
    // console.log(transactions);

    const existingCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const existentCategoriesTitles = existingCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    // Irá mapear tudo isso, retirando o value pelo indexOf, ou seja,
    // se houver outro valor, porém não pertencer ao índice correto no array
    // ele será eliminado.

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existingCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);
    // ao finalizar a leitura do arquivo CSV, precisaremos descartar o arquivo.

    return createdTransactions;
  }
}

export default ImportTransactionsService;
