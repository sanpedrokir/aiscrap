export type Category = "shopping" | "news" | "jobs" | "custom";

export const CATEGORY_OPTIONS: {
  value: Category;
  label: string;
  fields: string;
}[] = [
  {
    value: "shopping",
    label: "Shopping",
    fields: "Product, price, rating, availability",
  },
  {
    value: "news",
    label: "News / Article",
    fields: "Headline, date, author, article",
  },
  {
    value: "jobs",
    label: "Jobs",
    fields: "Company, location, job title, salary",
  },
  { value: "custom", label: "Custom", fields: "You choose the fields" },
];
