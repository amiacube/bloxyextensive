<?php

namespace App\Controller\Admin;

use App\Entity\Jeu;
use App\Form\JeuType;
use App\Repository\GenreRepository;
use App\Repository\JeuRepository;
use App\Service\RobloxApi;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/jeu')]
final class JeuController extends AbstractController
{
    #[Route(name: 'admin_jeu_index', methods: ['GET'])]
    public function index(JeuRepository $jeuRepository): Response
    {
        return $this->render('admin/jeu/index.html.twig', [
            'jeus' => $jeuRepository->findBy([], ['titre' => 'ASC']),
        ]);
    }

    #[Route('/new', name: 'admin_jeu_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        $jeu = new Jeu();
        $form = $this->createForm(JeuType::class, $jeu);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($jeu);
            $entityManager->flush();

            return $this->redirectToRoute('admin_jeu_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/jeu/new.html.twig', [
            'jeu' => $jeu,
            'form' => $form,
        ]);
    }

    #[Route('/importer', name: 'admin_jeu_importer', methods: ['GET', 'POST'])]
    public function importer(Request $request, GenreRepository $genreRepository, RobloxApi $robloxApi, EntityManagerInterface $entityManager): Response
    {
        if ($request->isMethod('POST')) {
            if (!$this->isCsrfTokenValid('importer', $request->getPayload()->getString('_token'))) {
                throw $this->createAccessDeniedException();
            }

            $placeId = $robloxApi->extrairePlaceId($request->getPayload()->getString('roblox'));
            $genre = $genreRepository->find($request->getPayload()->getInt('genre'));

            if ($placeId === null || $genre === null) {
                $this->addFlash('error', 'Il faut une URL Roblox valide et un genre');
            } else {
                $jeu = new Jeu();
                $jeu->setGenre($genre)->setCouleur(sprintf('#%06x', mt_rand(0x202020, 0xd0d0d0)));

                if ($robloxApi->importer($jeu, $placeId) === null) {
                    $this->addFlash('error', 'Roblox ne connaît pas ce jeu, ou l\'API ne répond pas');
                } else {
                    $entityManager->persist($jeu);
                    $entityManager->flush();
                    $this->addFlash('success', 'Jeu importé depuis Roblox, vérifie le titre et la description');

                    return $this->redirectToRoute('admin_jeu_edit', ['id' => $jeu->getId()], Response::HTTP_SEE_OTHER);
                }
            }
        }

        return $this->render('admin/jeu/importer.html.twig', [
            'genres' => $genreRepository->findBy([], ['nom' => 'ASC']),
        ]);
    }

    #[Route('/{id}/edit', name: 'admin_jeu_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Jeu $jeu, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(JeuType::class, $jeu);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            return $this->redirectToRoute('admin_jeu_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/jeu/edit.html.twig', [
            'jeu' => $jeu,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'admin_jeu_delete', methods: ['POST'])]
    public function delete(Request $request, Jeu $jeu, EntityManagerInterface $entityManager): Response
    {
        if ($this->isCsrfTokenValid('delete'.$jeu->getId(), $request->getPayload()->getString('_token'))) {
            $entityManager->remove($jeu);
            $entityManager->flush();
        }

        return $this->redirectToRoute('admin_jeu_index', [], Response::HTTP_SEE_OTHER);
    }
}
