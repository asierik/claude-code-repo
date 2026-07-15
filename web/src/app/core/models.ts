export interface User { id: number; username: string; }

export interface Space {
  id: number;
  name: string;
  owner_id: number;
  owner: string;
  role: 'owner' | 'member';
}

export interface Member { username: string; role: string; }

export interface Ingredient { name: string; amount: string; }

export interface Dish {
  id: number;
  name: string;
  ingredients: Ingredient[];
  tags: string[];
}

export type Slot = 'breakfast' | 'lunch' | 'dinner';

export interface PlanEntry {
  id: number;
  date: string;        // YYYY-MM-DD
  slot: Slot;
  dish_id: number;
  dish_name: string;
}

export interface GroceryItem {
  key: string;
  name: string;
  amounts: string[];
  from: string[];
  checked: boolean;
  custom?: boolean;
  id?: number;
}
