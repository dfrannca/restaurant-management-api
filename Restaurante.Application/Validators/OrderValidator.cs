using FluentValidation;
using Restaurante.Application.DTOs;

namespace Restaurante.Application.Validators;

public class CreateOrderDtoValidator : AbstractValidator<CreateOrderDto>
{
    public CreateOrderDtoValidator()
    {
        RuleFor(x => x.TableId)
            .GreaterThan(0).WithMessage("Table is required");

        RuleFor(x => x.CustomerName)
            .MaximumLength(100).WithMessage("Customer name cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.CustomerName));

        RuleFor(x => x.Observations)
            .MaximumLength(500).WithMessage("Observations cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Observations));
    }
}

public class AddOrderItemDtoValidator : AbstractValidator<AddOrderItemDto>
{
    public AddOrderItemDtoValidator()
    {
        RuleFor(x => x.ProductId)
            .GreaterThan(0).WithMessage("Product is required");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than 0");

        RuleFor(x => x.Observations)
            .MaximumLength(500).WithMessage("Observations cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Observations));
    }
}

public class UpdateOrderItemDtoValidator : AbstractValidator<UpdateOrderItemDto>
{
    public UpdateOrderItemDtoValidator()
    {
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than 0");

        RuleFor(x => x.Observations)
            .MaximumLength(500).WithMessage("Observations cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Observations));
    }
}

public class CloseOrderDtoValidator : AbstractValidator<CloseOrderDto>
{
    public CloseOrderDtoValidator()
    {
        RuleFor(x => x.PaymentMethod)
            .IsInEnum().WithMessage("Invalid payment method");
        RuleFor(x => x.UserId)
            .GreaterThan(0).WithMessage("User is required to close the order");
    }
}
