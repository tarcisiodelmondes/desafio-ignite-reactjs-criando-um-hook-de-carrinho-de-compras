import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (productExists) {
        const { data } = await api.get<Stock>(`/stock/${productId}`);

        if (productExists.amount >= data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        productExists.amount += 1;

        const productUpdate = cart.map((product) => {
          if (product.id === productExists.id) return productExists;

          return product;
        });

        setCart(productUpdate);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(productUpdate)
        );
        return;
      }

      const { data } = await api.get<Product>(`/products/${productId}`);

      setCart((prev) => [...prev, { ...data, amount: 1 }]);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...cart, { ...data, amount: 1 }])
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (!product) throw new Error();

      const productRemoved = cart.filter((product) => product.id !== productId);

      setCart(productRemoved);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(productRemoved));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productsUpdate = cart.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          amount,
        };
      });

      setCart(productsUpdate);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(productsUpdate));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
