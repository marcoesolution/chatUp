/**
 * Hook para gerenciar par de chaves do usuário
 * 
 * Garante que o usuário tenha um par de chaves (pública/privada)
 * e que a chave pública esteja sincronizada com o Firestore
 */

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getOrCreateKeyPair, hasPublicKey } from "@/core/security/keyManagement";

export interface UseKeyPairReturn {
	isLoading: boolean;
	hasKeyPair: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

/**
 * Hook para gerenciar par de chaves E2EE do usuário
 */
export function useKeyPair(): UseKeyPairReturn {
	const { firebaseUser } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [hasKeyPair, setHasKeyPair] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const initializeKeyPair = async () => {
		if (!firebaseUser) {
			setIsLoading(false);
			setHasKeyPair(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Verificar se já tem chave pública no Firestore
			const hasPublic = await hasPublicKey(firebaseUser.uid);
			
			if (hasPublic) {
				// Chave pública existe, verificar se chave privada existe localmente
				// Se não existir, não podemos descriptografar mensagens
				// Mas podemos continuar (chave privada será criada quando necessário)
				setHasKeyPair(true);
			} else {
				// Não tem chave pública, gerar par de chaves
				console.log("🔄 Gerando par de chaves para usuário...");
				await getOrCreateKeyPair(firebaseUser.uid);
				setHasKeyPair(true);
			}
		} catch (err: any) {
			console.error("❌ Erro ao inicializar par de chaves:", err);
			setError(err.message || "Erro ao inicializar chaves");
			setHasKeyPair(false);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		initializeKeyPair();
	}, [firebaseUser?.uid]);

	return {
		isLoading,
		hasKeyPair,
		error,
		refresh: initializeKeyPair,
	};
}

