import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerService } from './customer.service';

class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class CreateOrderDto {
  @IsString()
  tableName!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get('menu')
  menu() {
    return { items: this.customer.getMenu() };
  }

  @Post('orders')
  createOrder(@Body() body: CreateOrderDto) {
    return this.customer.createOrder(body);
  }

  @Get('orders/:orderId')
  getOrder(@Param('orderId') orderId: string) {
    return this.customer.getOrder(orderId);
  }
}
