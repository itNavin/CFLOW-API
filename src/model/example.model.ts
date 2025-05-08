import { prisma } from "..";

export const createExample = async (name: string) => {
  const newEx = await prisma.exampleTable.create({
    data: {
      name,
    },
  });

  return newEx;
};

export const getAllExample = async () => {
  const data = await prisma.exampleTable.findMany();
  return data;
};
