<?php

namespace App\Controller\Admin;

use App\Entity\Avis;
use App\Entity\Jeu;
use App\Entity\User;
use App\Repository\AvisRepository;
use App\Repository\GenreRepository;
use App\Repository\JeuRepository;
use App\Repository\UserRepository;
use App\Service\RobloxApi;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/api')]
class ApiController extends AbstractController
{
    #[Route('/stats', name: 'admin_api_stats', methods: ['GET'])]
    public function stats(
        UserRepository $userRepository,
        JeuRepository $jeuRepository,
        GenreRepository $genreRepository,
        AvisRepository $avisRepository,
    ): JsonResponse {
        return $this->json([
            'utilisateurs' => $userRepository->count([]),
            'jeux' => $jeuRepository->count([]),
            'genres' => $genreRepository->count([]),
            'avis' => $avisRepository->count([]),
            'repartitionNotes' => $avisRepository->repartitionNotes(),
        ]);
    }

    #[Route('/top-jeux', name: 'admin_api_top_jeux', methods: ['GET'])]
    public function topJeux(JeuRepository $jeuRepository): JsonResponse
    {
        $data = [];
        foreach ($jeuRepository->mieuxNotes(10) as $row) {
            $data[] = [
                'id' => $row['jeu']->getId(),
                'titre' => $row['jeu']->getTitre(),
                'genre' => $row['jeu']->getGenre()->getNom(),
                'moyenne' => $row['moyenne'],
                'nbAvis' => $row['nb'],
            ];
        }

        return $this->json($data);
    }

    #[Route('/jeux/sync', name: 'admin_api_jeux_sync', methods: ['POST'])]
    public function syncJeux(JeuRepository $jeuRepository, RobloxApi $robloxApi, EntityManagerInterface $entityManager): JsonResponse
    {
        $jeux = $jeuRepository->findAll();
        $nb = $robloxApi->synchroniser($jeux);
        $entityManager->flush();

        return $this->json(['total' => count($jeux), 'misAJour' => $nb]);
    }

    #[Route('/jeux/{id}/sync', name: 'admin_api_jeu_sync', methods: ['POST'])]
    public function syncJeu(Jeu $jeu, RobloxApi $robloxApi, EntityManagerInterface $entityManager): JsonResponse
    {
        if ($jeu->getPlaceId() === null) {
            return $this->json(['error' => 'Ce jeu n\'a pas d\'ID Roblox.'], 400);
        }

        $nb = $robloxApi->synchroniser([$jeu]);
        $entityManager->flush();

        if ($nb === 0) {
            return $this->json(['error' => 'L\'API Roblox n\'a pas répondu pour ce jeu.'], 502);
        }

        return $this->json([
            'id' => $jeu->getId(),
            'imageUrl' => $jeu->getImageUrl(),
            'vignetteUrl' => $jeu->getVignetteUrl(),
            'joueursEnLigne' => $jeu->getJoueursEnLigne(),
            'visites' => $jeu->getVisites(),
            'majRoblox' => $jeu->getMajRoblox()?->format('d/m/Y H:i'),
        ]);
    }

    #[Route('/avis', name: 'admin_api_avis', methods: ['GET'])]
    public function avis(AvisRepository $avisRepository): JsonResponse
    {
        $data = [];
        foreach ($avisRepository->derniers(50) as $avis) {
            $data[] = [
                'id' => $avis->getId(),
                'jeu' => $avis->getJeu()->getTitre(),
                'jeuId' => $avis->getJeu()->getId(),
                'auteur' => $avis->getAuteur()->getPseudo(),
                'note' => $avis->getNote(),
                'commentaire' => $avis->getCommentaire(),
                'creeLe' => $avis->getCreeLe()->format('d/m/Y H:i'),
            ];
        }

        return $this->json($data);
    }

    #[Route('/avis/{id}', name: 'admin_api_avis_delete', methods: ['DELETE'])]
    public function supprimerAvis(Avis $avis, EntityManagerInterface $entityManager): JsonResponse
    {
        $entityManager->remove($avis);
        $entityManager->flush();

        return $this->json(null, 204);
    }

    #[Route('/utilisateurs', name: 'admin_api_users', methods: ['GET'])]
    public function utilisateurs(UserRepository $userRepository): JsonResponse
    {
        $data = [];
        foreach ($userRepository->findBy([], ['pseudo' => 'ASC']) as $user) {
            $data[] = [
                'id' => $user->getId(),
                'pseudo' => $user->getPseudo(),
                'email' => $user->getEmail(),
                'admin' => $user->isAdmin(),
                'nbAvis' => $user->getAvis()->count(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/utilisateurs/{id}/admin', name: 'admin_api_user_toggle', methods: ['POST'])]
    public function toggleAdmin(User $user, EntityManagerInterface $entityManager): JsonResponse
    {
        if ($user === $this->getUser()) {
            return $this->json(['error' => 'Tu ne peux pas retirer ton propre rôle admin.'], 400);
        }

        $user->setRoles($user->isAdmin() ? [] : ['ROLE_ADMIN']);
        $entityManager->flush();

        return $this->json(['id' => $user->getId(), 'admin' => $user->isAdmin()]);
    }
}
