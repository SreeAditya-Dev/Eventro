
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCategories } from "@/data/events";

interface CategoriesProps {
  onSelectCategory: (category: string) => void;
  selectedCategory: string;
  categories?: string[];
}

const Categories = ({ onSelectCategory, selectedCategory, categories: propCategories }: CategoriesProps) => {
  const categories = propCategories || getCategories();

  return (
    <div className="flex overflow-x-auto py-4 gap-2 no-scrollbar">
      {categories.map((category) => (
        <Button
          key={category}
          variant="outline"
          size="sm"
          onClick={() => onSelectCategory(category)}
          className={cn(
            "category-button whitespace-nowrap",
            selectedCategory === category ? "bg-event-purple text-white hover:bg-event-purple/90" : ""
          )}
        >
          {category}
        </Button>
      ))}
    </div>
  );
};

export default Categories;
