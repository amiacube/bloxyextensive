<?php

namespace App\Controller;

use App\Entity\Avis;
use App\Entity\Genre;
use App\Entity\Jeu;
use App\Form\AvisType;
use App\Repository\GenreRepository;
use App\Repository\JeuRepository;
use App\Service\RobloxApi;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/jeux')]
class JeuController extends AbstractController
{
    #[Route('', name: 'app_jeu_index', methods: ['GET'])]
    public function index(Request $request, JeuRepository $jeuRepository, GenreRepository $genreRepository): Response
    {
        $q = trim((string) $request->query->get('q'));
        $genre = $request->query->getInt('genre') ? $genreRepository->find($request->query->getInt('genre')) : null;

        return $this->render('jeu/index.html.twig', [
            'jeux' => $jeuRepository->rechercher($q, $genre),
            'genres' => $genreRepository->findBy([], ['nom' => 'ASC']),
            'q' => $q,
            'genreActif' => $genre,
        ]);
    }

    #[Route('/roblox', name: 'app_jeu_roblox', methods: ['GET'])]
    public function roblox(Request $request, RobloxApi $robloxApi, JeuRepository $jeuRepository): Response
    {
        $q = trim((string) $request->query->get('q'));
        $resultats = $q !== '' ? $robloxApi->rechercher($q) : [];

        $dejaLa = [];
        if ($resultats !== []) {
            foreach ($jeuRepository->findBy(['placeId' => array_column($resultats, 'placeId')]) as $jeu) {
                $dejaLa[$jeu->getPlaceId()] = $jeu;
            }
        }

        return $this->render('jeu/roblox.html.twig', [
            'q' => $q,
            'resultats' => $resultats,
            'dejaLa' => $dejaLa,
        ]);
    }

    #[Route('/roblox/ajouter', name: 'app_jeu_roblox_ajouter', methods: ['POST'])]
    public function robloxAjouter(Request $request, RobloxApi $robloxApi, JeuRepository $jeuRepository, GenreRepository $genreRepository, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted('ROLE_USER');

        if (!$this->isCsrfTokenValid('ajouter-roblox', $request->getPayload()->getString('_token'))) {
            throw $this->createAccessDeniedException();
        }

        $placeId = $request->getPayload()->getInt('placeId');
        $existant = $jeuRepository->findOneBy(['placeId' => $placeId]);
        if ($existant !== null) {
            return $this->redirectToRoute('app_jeu_show', ['id' => $existant->getId()]);
        }

        $jeu = new Jeu();
        $jeu->setCouleur(sprintf('#%06x', mt_rand(0x202020, 0xd0d0d0)));
        $infos = $robloxApi->importer($jeu, $placeId);
        if ($infos === null) {
            $this->addFlash('error', 'Impossible de récupérer ce jeu sur Roblox');

            return $this->redirectToRoute('app_jeu_roblox', ['q' => $request->getPayload()->getString('q')]);
        }

        $nomGenre = $robloxApi->genreFrancais($infos['genre_l1'] ?? null);
        $genre = $genreRepository->findOneBy(['nom' => $nomGenre]);
        if ($genre === null) {
            $genre = (new Genre())->setNom($nomGenre);
            $entityManager->persist($genre);
        }
        $jeu->setGenre($genre);

        $entityManager->persist($jeu);
        $entityManager->flush();
        $this->addFlash('success', $jeu->getTitre().' est dans le catalogue, à toi de le noter');

        return $this->redirectToRoute('app_jeu_show', ['id' => $jeu->getId()]);
    }

    #[Route('/{id}', name: 'app_jeu_show', requirements: ['id' => '\d+'], methods: ['GET', 'POST'])]
    public function show(Jeu $jeu, Request $request, EntityManagerInterface $entityManager): Response
    {
        $monAvis = $this->getUser() ? $jeu->getAvisDe($this->getUser()) : null;
        $form = null;

        if ($this->getUser() && $monAvis === null) {
            $avis = new Avis();
            $avis->setJeu($jeu)->setAuteur($this->getUser());
            $form = $this->createForm(AvisType::class, $avis);
            $form->handleRequest($request);

            if ($form->isSubmitted() && $form->isValid()) {
                $entityManager->persist($avis);
                $entityManager->flush();
                $this->addFlash('success', 'Ton avis est publié');

                return $this->redirectToRoute('app_jeu_show', ['id' => $jeu->getId()]);
            }
        }

        return $this->render('jeu/show.html.twig', [
            'jeu' => $jeu,
            'monAvis' => $monAvis,
            'form' => $form,
        ]);
    }
}
