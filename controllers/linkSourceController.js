const { PrismaClient } = require("@prisma/client");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const prisma = new PrismaClient();

const addLinkSource = catchAsync(async (req, res, next) => {
  const { link_source_name } = req.body;

  if (!link_source_name) {
    return next(new AppError("Link source name is required", 400));
  }

  const newLinkSource = await prisma.linkSource.create({
    data: {
      link_source_name,
    },
  });

  res.status(201).json({
    status: "success",
    message: "Link source added successfully",
    data: {
      link_source: newLinkSource,
    },
  });
});

const getAllLinkSources = catchAsync(async (req, res, next) => {
  const linkSources = await prisma.linkSource.findMany();

  res.status(200).json({
    status: "success",
    data: {
      link_sources: linkSources,
    },
  });
});

const deleteLinkSource = catchAsync(async (req, res, next) => {
  const { link_source_id } = req.body;

  if (!link_source_id) {
    return next(new AppError("Link source ID is required", 400));
  }

  const deletedLinkSource = await prisma.linkSource.delete({
    where: {
      link_source_id: +link_source_id,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Link source deleted successfully",
    data: {
      link_source: deletedLinkSource,
    },
  });
});

const updateLinkSource = catchAsync(async (req, res, next) => {
  const { link_source_id, link_source_name } = req.body;

  if (!link_source_id || !link_source_name) {
    return next(new AppError("Link source ID and name are required", 400));
  }

  const updatedLinkSource = await prisma.linkSource.update({
    where: {
      link_source_id: +link_source_id,
    },
    data: {
      link_source_name,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Link source updated successfully",
    data: {
      link_source: updatedLinkSource,
    },
  });
});

module.exports = {
  addLinkSource,
  getAllLinkSources,
  deleteLinkSource,
  updateLinkSource,
};
